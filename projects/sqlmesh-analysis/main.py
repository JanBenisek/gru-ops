def main():
    import pandas as pd
    import functools
    import glob

    print("Hello from sqlmesh-analysis!")

    df = pd.concat(
        map(functools.partial(pd.read_csv, sep=';'), 
        glob.glob('/Users/janbenisek/Desktop/migros/all_receipts/*.csv')))
    print(df.shape)
    
    df.to_csv('/Users/janbenisek/Desktop/output.csv', sep=';', index=False, header=True)
if __name__ == "__main__":
    main()
